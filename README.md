# gql-generator-node

Generate queries from graphql schema, used for writing api test.

## Example
```gql
# Sample schema
type Query {
  user(id: Int!): User!
}

type User {
  id: Int!
  username: String!
  email: String!
  createdAt: String!
}
```

```gql
# Sample query generated
query user($id: Int!) {
  user(id: $id){
    id
    username
    email
    createdAt
  }
}
```

## Usage
```bash
# Install
npm install gql-generator-node --save-dev 
```

# Generate sample queries from schema
```
import gqlGenerator from 'gql-generator';
const {queries, mutations, subscriptions} = gqlGenerator(schema);

console.log(mutations.signup);
/*
mutation signup($username: String!, email: String!, password: String!){
  signup(username: $username, email: $email, password: $password){
    token
    user {
      id
      username
      email
      createdAt
    }
  }
}
*/

```

## Usage example

Say you have a graphql schema like this: 

```gql
type Mutation {
  signup(
    email: String!
    username: String!
    password: String!
  ): UserToken!
}

type UserToken {
  token: String!
  user: User!
}

type User {
  id: Int!
  username: String!
  email: String!
  createdAt: String!
}
```

Before this tool, you write graphql api test like this:

```js
test('signup', async () => {
  const query = `mutation signup($username: String!, email: String!, password: String!){
    signup(username: $username, email: $email, password: $password){
      token
      user {
        id
        username
        email
        createdAt
      }
    }
  }`;

  return graphql(query);
});
```

As `gqlGenerator` generated the queries for you, you don't need to write the query yourself, so your test will becomes:

```js
const {queries} = gqlGenerator(schema);

test.each(Object.entries(queries))('%s', async ([name,query]) => 
  graphql(query)
);
```

## Notes

- As this tool is used for tests, it expands all of the fields in a query. There might be recursive fields in the query, so `gqlGenerator` ignores the types which have been added in the parent queries already.
- Variable names are derived from argument names, so variables generated from multiple occurrences of the same argument name must be deduped. An index is appended to any duplicates e.g. `region(language: $language1)`.

> Code has been adopted from [modelo/gql-generator](https://github.com/modelo/gql-generator)
