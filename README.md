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
```js
import {generateAll} from 'gql-generator-node';
const {queries, mutations, subscriptions} = generateAll(schema);

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
const {queries} = generateAll(schema);

test.each(Object.entries(queries))('%s', async ([name,query]) => 
  graphql(query)
);
```

## Advanced used cases

One might want to generate single query which can be done as shown in test file:
```js
import {generateQuery} from "gql-generator-node";

generateQuery({
	field: schema
		.getQueryType()
		.getFields().user
})
```
Moreover the responese fields might be limited by passing skeleton object:
```js
generateQuery({
	field: schema
		.getQueryType()
		.getFields().user,
	skeleton: {
		'email':
			true
	}
})
```

### Custom dedupe

As default top variables names corresponds to schema while nested ones can be addressed by the path - so all of them can be addressed independently in declarative way.
Ex:
```graphql
mutation signup($signup_user_context_user_details_region_language: String, $signup_user_details_region_language: String, $email: String!, $username: String!, $password: String!){
    signup(email: $email, username: $username, password: $password){
        token
        user{
            id
            username
            email
            createdAt
            context{
                user{
                    id
                    username
                    email
                    createdAt
                    details{
                        ... on Guest {
                            region(language: $signup_user_context_user_details_region_language)
                        }
                        ... on Member {
                            address
                        }
                    }
                }
                domain
            }
            details{
                ... on Guest {
                    region(language: $signup_user_details_region_language)
                }
                ... on Member {
                    address
                }
            }
        }
    }
}
```
Yet some applications might take advantage of custom dedupe functions as follows:
```js
gqlGenerator(schema,depth,({args})=>{
		const o = {};
		(args || []).forEach(arg=>{
			o[arg.name] = arg;
		});
		return o;
	})
```
=>
```graphql
mutation signup($language: String, $email: String!, $username: String!, $password: String!){
    signup(email: $email, username: $username, password: $password){
        token
        user{
            id
            username
            email
            createdAt
            context{
                user{
                    id
                    username
                    email
                    createdAt
                    details{
                        ... on Guest {
                            region(language: $language)
                        }
                        ... on Member {
                            address
                        }
                    }
                }
                domain
            }
            details{
                ... on Guest {
                    region(language: $language)
                }
                ... on Member {
                    address
                }
            }
        }
    }
}
```

## Notes

- Variable names are derived from argument names, so variables generated from multiple occurrences of the same argument name must be deduped. By default an subtree arguments are given path prefix (ex. can be found in dedupe description).

> Code has been adopted from [modelo/gql-generator](https://github.com/modelo/gql-generator)

## Maintenance

Please feel free open the issues! Although, current stage satisfy my application usage, I would be happy provide help and improvements if there will be need for it. 

---
Happy hacking!