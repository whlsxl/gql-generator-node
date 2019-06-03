#!/usr/bin/env node

/**
 * Compile arguments dictionary for a field
 * @param field current field object
 * @param duplicateArgCounts map for deduping argument name collisions
 * @param allArgsDict dictionary of all arguments
 */
const getFieldArgsDict = (field,
                          duplicateArgCounts,
                          allArgsDict = {}, path) =>
	field.args.reduce((o, arg) => {
		const arg_name = `${path.join('_')}_${field.name}_${arg.name}`;
		if (arg_name in duplicateArgCounts) {
			const index = duplicateArgCounts[arg_name] + 1;
			duplicateArgCounts[arg_name] = index;
			o[`${arg_name}${index}`] = arg;
		} else if (allArgsDict[arg_name]) {
			duplicateArgCounts[arg_name] = 1;
			o[arg_name] = arg;
		} else if (!path.length) {
			o[arg.name] = arg;
		} else {
			o[arg_name] = arg;
		}
		return o;
	}, {});

module.exports = function (schema, depthLimit = 100, dedupe = getFieldArgsDict) {

	const result = {};

	/**
	 * Generate variables string
	 * @param dict dictionary of arguments
	 */
	const getArgsToVarsStr = dict => Object.entries(dict)
		.map(([varName, arg]) => `${arg.name}: $${varName}`)
		.join(', ');

	/**
	 * Generate types string
	 * @param dict dictionary of arguments
	 */
	const getVarsToTypesStr = dict => Object.entries(dict)
		.map(([varName, arg]) => `$${varName}: ${arg.type}`)
		.join(', ');

	/**
	 * Generate the query for the specified field
	 * @param curName name of the current field
	 * @param curParentType parent type of the current field
	 * @param curParentName parent name of the current field
	 * @param argumentsDict dictionary of arguments from all fields
	 * @param duplicateArgCounts map for deduping argument name collisions
	 * @param crossReferenceKeyList list of the cross reference
	 * @param curDepth currentl depth of field
	 */
	const generateQuery = (curName,
	                       curParentType,
	                       curParentName,
	                       argumentsDict = {},
	                       duplicateArgCounts = {},
	                       crossReferenceKeyList = [], // [`${curParentName}To${curName}Key`]
	                       curDepth = 1,
	                       path = []) => {
		const field = schema.getType(curParentType).getFields()[curName];
		const curTypeName = field.type.inspect().replace(/[[\]!]/g, '');
		const curType = schema.getType(curTypeName);
		let queryStr = '';
		let childQuery = '';

		if (curType.getFields) {
			const crossReferenceKey = `${curParentName}To${curName}Key`;
			if (crossReferenceKeyList.indexOf(crossReferenceKey) !== -1 || curDepth > depthLimit) return '';
			crossReferenceKeyList.push(crossReferenceKey);
			const childKeys = Object.keys(curType.getFields());
			childQuery = childKeys
				.map(cur => generateQuery(cur, curType, curName, argumentsDict, duplicateArgCounts,
					crossReferenceKeyList, curDepth + 1, path.concat(curName)).queryStr)
				.filter(cur => cur)
				.join('\n');
		}

		if (!(curType.getFields && !childQuery)) {
			queryStr = `${'    '.repeat(curDepth)}${field.name}`;
			if (field.args.length > 0) {
				const dict = dedupe(field, duplicateArgCounts, argumentsDict, path);
				Object.assign(argumentsDict, dict);
				queryStr += `(${getArgsToVarsStr(dict)})`;
			}
			if (childQuery) {
				queryStr += `{\n${childQuery}\n${'    '.repeat(curDepth)}}`;
			}
		}

		/* Union types */
		if (curType.astNode && curType.astNode.kind === 'UnionTypeDefinition') {
			const types = curType.getTypes();
			if (types && types.length) {
				const indent = `${'    '.repeat(curDepth)}`;
				const fragIndent = `${'    '.repeat(curDepth + 1)}`;
				queryStr += '{\n';

				for (let i = 0, len = types.length; i < len; i++) {
					const valueTypeName = types[i];
					const valueType = schema.getType(valueTypeName);
					const unionChildQuery = Object.keys(valueType.getFields())
						.map(cur => generateQuery(cur, valueType, curName, argumentsDict, duplicateArgCounts,
							crossReferenceKeyList, curDepth + 2, path.concat(curName)).queryStr)
						.filter(cur => cur)
						.join('\n');
					queryStr += `${fragIndent}... on ${valueTypeName} {\n${unionChildQuery}\n${fragIndent}}\n`;
				}
				queryStr += `${indent}}`;
			}
		}
		return { queryStr, argumentsDict };
	};

	/**
	 * Generate the query for the specified field
	 * @param obj one of the root objects(Query, Mutation, Subscription)
	 * @param description description of the current object
	 */
	const addToResult = (obj, description) => {
		let field;
		switch (description) {
			case 'Mutation':
				field = 'mutations';
				break;
			case 'Query':
				field = 'queries';
				break;
			case 'Subscription':
				field = 'subscriptions';
				break;
			default:
				console.log('[gqlg warning]:', 'description is required');
		}
		result[field] = {};
		Object.keys(obj).forEach((type) => {
			result[field][type] = generateWrappedQuery({ type, description });
		});
	};

	function generateWrappedQuery({ type, description }) {
		const queryResult = generateQuery(type, description);
		const varsToTypesStr = getVarsToTypesStr(queryResult.argumentsDict);
		const query = queryResult.queryStr;
		return `${description.toLowerCase()} ${type}${varsToTypesStr ? `(${varsToTypesStr})` : ''}{\n${query}\n}`;
	}

	if (schema.getMutationType()) {
		addToResult(schema.getMutationType().getFields(), 'Mutation');
	} else {
		console.log('[gqlg warning]:', 'No mutation type found in your schema');
	}

	if (schema.getQueryType()) {
		addToResult(schema.getQueryType().getFields(), 'Query');
	} else {
		console.log('[gqlg warning]:', 'No query type found in your schema');
	}

	if (schema.getSubscriptionType()) {
		addToResult(schema.getSubscriptionType().getFields(), 'Subscription');
	} else {
		console.log('[gqlg warning]:', 'No subscription type found in your schema');
	}

	return result;
};