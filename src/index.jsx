import fetch from 'isomorphic-fetch';
import {
  onError,
} from '@apollo/client/link/error';
import {
  from,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloProvider,
  gql,
  useQuery,
  useMutation,
} from '@apollo/client';
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {

} from "@apollo/client";
import "./index.css";

/*** LINK ***/
// import { graphql, print } from "graphql";
// import { ApolloLink, Observable } from "@apollo/client";
// function delay(wait) {
//   return new Promise(resolve => setTimeout(resolve, wait));
// }
// const link = new ApolloLink(operation => {
//   return new Observable(async observer => {
//     const { query, operationName, variables } = operation;
//     await delay(300);
//     try {
//       const result = await graphql({
//         schema,
//         source: print(query),
//         variableValues: variables,
//         operationName,
//       });
//       observer.next(result);
//       observer.complete();
//     } catch (err) {
//       observer.error(err);
//     }
//   });
// });

const API_URL = "https://swapi-graphql.netlify.app/.netlify/functions/index";

const errorLink = onError((error) => {
  console.log('ERROR', error);
});

const httpLink = new HttpLink({
  uri: API_URL,
});

/*** APP ***/


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

function App() {
  const [name, setName] = useState('');
  const {
    loading,
    data,
  } = useQuery(ALL_PEOPLE);

  const [addPerson] = useMutation(ADD_PERSON, {
    update: (cache, { data: { addPerson: addPersonData } }) => {
      const peopleResult = cache.readQuery({ query: ALL_PEOPLE });

      cache.writeQuery({
        query: ALL_PEOPLE,
        data: {
          ...peopleResult,
          people: [
            ...peopleResult.people,
            addPersonData,
          ],
        },
      });
    },
  });

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      <p>
        This application can be used to demonstrate an error in Apollo Client.
      </p>
      <div className="add-person">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={evt => setName(evt.target.value)}
        />
        <button
          onClick={() => {
            addPerson({ variables: { name } });
            setName('');
          }}
        >
          Add person
        </button>
      </div>
      <h2>Names</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul>
          {data?.people.map(person => (
            <li key={person.id}>{person.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

const client = new ApolloClient({
  cache: new InMemoryCache(),
  fetch,
  link: from([
    errorLink,
    httpLink,
  ]),
});

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
);
