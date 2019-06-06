require('graphql-import-node');
const typeDefs = require('../example/sampleTypeDef.graphql');
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema;
require('should');

const schema = makeExecutableSchema({ typeDefs });
import { generateAll, generateQuery } from "../src";

it('validate generated queries', async () => {
	generateAll(schema, undefined, ({ args }) => {
		const o = {};
		(args || []).forEach(arg => {
			o[arg.name] = arg;
		});
		return o;
	}).mutations.signin.indexOf('signin').should.not.equal(-1)
});

it('limt depth', async () =>
	generateAll(schema, 1).mutations.signup.indexOf('createdAt').should.equal(-1)
);

it('check field generator', async () =>
	expect(
		generateQuery({
			field: schema
				.getQueryType()
				.getFields().user
		})
	).toMatchSnapshot()
);

it('check field generator with skeleton', async () =>
	expect(
		generateQuery({
			field: schema
				.getQueryType()
				.getFields().user,
			skeleton: {
				email:
					true
			}
		})
	).toMatchSnapshot()
);