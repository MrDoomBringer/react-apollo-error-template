/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
} from "graphql";
const PersonType = new GraphQLObjectType({
  name: "Person",
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
  },
});

const peopleData = [
  { id: 1, name: "John Smith" },
  { id: 2, name: "Sara Smith" },
  { id: 3, name: "Budd Deey" },
];

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    people: {
      type: new GraphQLList(PersonType),
      resolve: () => peopleData,
    },
  },
});

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: {
    addPerson: {
      type: PersonType,
      args: {
        name: { type: GraphQLString },
      },
      resolve: function (_, { name }) {
        const person = {
          id: peopleData[peopleData.length - 1].id + 1,
          name,
        };

        peopleData.push(person);
        return person;
      },
    },
  },
});

const schema = new GraphQLSchema({ query: QueryType, mutation: MutationType });

/*** LINK ***/
import { graphql, print } from "graphql";
import {
  ApolloLink,
  Observable,
  useBackgroundQuery,
  useFragment,
} from "@apollo/client";
function delay(wait) {
  return new Promise((resolve) => setTimeout(resolve, wait));
}

const link = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation;
    await delay(300);
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName,
      });
      observer.next(result);
      observer.complete();
    } catch (err) {
      observer.error(err);
    }
  });
});

/*** APP ***/
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
  useMutation,
} from "@apollo/client";
import "./index.css";

const ALL_PEOPLE = gql`
  query AllPeople {
    people {
      id
      name
    }
  }
`;

const ADD_PERSON = gql`
  mutation AddPerson($name: String) {
    addPerson(name: $name) {
      id
      name
    }
  }
`;

const PersonFragment = gql`
  fragment PersonFragment on Person {
    name
  }
`;

const peopleQuery = gql`
  query AllPeople {
    people {
      id
      ...PersonFragment
    }
  }
  ${PersonFragment}
`;

function App() {
  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>
      <AddPerson />
      <Names />
    </main>
  );
}

const Names = () => {
  const { useData, useLoading } = useBackgroundQuery({
    query: peopleQuery,
  });
  const loading = useLoading();
  const data = useData();

  return (
    <>
      <h2>Names</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {data?.people.map((person) => (
            <Person key={person.id} id={person.id} />
          ))}
        </ul>
      )}
    </>
  );
};

const Person = (props) => {
  const { complete, data } = useFragment({
    fragment: PersonFragment,
    from: {
      __typename: "Person",
      id: props.id,
    },
  });
  return <li key={props.id}>{data.name}</li>;
};

const AddPerson = () => {
  const [name, setName] = useState("");
  const [addPerson] = useMutation(ADD_PERSON, {
    update: (cache, { data: { addPerson: addPersonData } }) => {
      const peopleResult = cache.readQuery({ query: ALL_PEOPLE });

      cache.writeQuery({
        query: ALL_PEOPLE,
        data: {
          ...peopleResult,
          people: [...peopleResult.people, addPersonData],
        },
      });
    },
  });
  return (
    <div className="add-person">
      <label htmlFor="name">Name</label>
      <input
        type="text"
        name="name"
        value={name}
        onChange={(evt) => setName(evt.target.value)}
      />
      <button
        onClick={() => {
          addPerson({ variables: { name } });
          setName("");
        }}
      >
        Add person
      </button>
    </div>
  );
};

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
