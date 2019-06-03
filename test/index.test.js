const gqlGenerator = require('../src');
require('graphql-import-node');
const typeDefs = require('../example/sampleTypeDef.graphql');
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
require('should');
const graphql = require('graphql');

const schema = makeExecutableSchema({ typeDefs });

it('validate generated queries', async () => {
	console.log(graphql);
	gqlGenerator(schema,undefined,({args})=>{
		const o = {};
		(args || []).forEach(arg=>{
			o[arg.name] = arg;
		});
		return o;
	}).mutations.signin.indexOf('signin').should.not.equal(-1)
});

it('limt depth', async () =>
	gqlGenerator(schema,1).mutations.signup.indexOf('createdAt').should.equal(-1)
);