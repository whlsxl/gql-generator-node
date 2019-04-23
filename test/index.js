const gqlGenerator = require('../index');
require('graphql-import-node');
const typeDefs = require('../example/sampleTypeDef.graphql');
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
require('should');

const schema = makeExecutableSchema({ typeDefs:typeDefs });

test('validate generated queries', async () =>
  gqlGenerator(schema).mutations.signin.indexOf('signin').should.not.equal(-1)
);

test('limt depth', async () =>
  gqlGenerator(schema,1).mutations.signup.indexOf('createdAt').should.equal(-1)
);
