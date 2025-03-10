import { CannedResponse } from '@rocket.chat/models';
import { escapeRegExp } from '@rocket.chat/string-helpers';

import { hasPermissionAsync } from '../../../../../app/authorization/server/functions/hasPermission';
import { getDepartmentsWhichUserCanAccess } from '../../../livechat-enterprise/server/api/lib/departments';
import { getTagsInformation } from './tags';

export async function findAllCannedResponses({ userId }) {
	// If the user is an admin or livechat manager, get his own responses and all responses from all departments
	if (await hasPermissionAsync(userId, 'view-all-canned-responses')) {
		const cannedResponses = await CannedResponse.find({
			$or: [
				{
					scope: 'user',
					userId,
				},
				{
					scope: 'department',
				},
				{
					scope: 'global',
				},
			],
		}).toArray();
		return getTagsInformation(cannedResponses);
	}

	// If the user it not any of the previous roles nor an agent, then get only his own responses
	if (!(await hasPermissionAsync(userId, 'view-agent-canned-responses'))) {
		const cannedResponses = await CannedResponse.find({
			scope: 'user',
			userId,
		}).toArray();
		return getTagsInformation(cannedResponses);
	}

	// Last scenario: user is an agent, so get his own responses and those from the departments he is in
	const accessibleDepartments = await getDepartmentsWhichUserCanAccess(userId);

	const cannedResponses = await CannedResponse.find({
		$or: [
			{
				scope: 'user',
				userId,
			},
			{
				scope: 'department',
				departmentId: {
					$in: accessibleDepartments,
				},
			},
			{
				scope: 'global',
			},
		],
	}).toArray();

	return getTagsInformation(cannedResponses);
}

export async function findAllCannedResponsesFilter({ userId, shortcut, text, departmentId, scope, createdBy, tags = [], options = {} }) {
	let extraFilter = [];
	// if user cannot see all, filter to private + public + departments user is in
	if (!(await hasPermissionAsync(userId, 'view-all-canned-responses'))) {
		const accessibleDepartments = await getDepartmentsWhichUserCanAccess(userId);

		const isDepartmentInScope = (departmentId) => !!accessibleDepartments.includes(departmentId);

		const departmentIds = departmentId && isDepartmentInScope(departmentId) ? [departmentId] : accessibleDepartments;

		extraFilter = [
			{
				$or: [
					{
						scope: 'user',
						userId,
					},
					{
						scope: 'department',
						departmentId: {
							$in: departmentIds,
						},
					},
					{
						scope: 'global',
					},
				],
			},
		];
	}

	if (departmentId) {
		extraFilter = [
			{
				departmentId,
			},
		];
	}

	const textFilter = new RegExp(escapeRegExp(text), 'i');

	let filter = {
		$and: [
			...(shortcut ? [{ shortcut }] : []),
			...(text ? [{ $or: [{ shortcut: textFilter }, { text: textFilter }] }] : []),
			...(scope ? [{ scope }] : []),
			...(createdBy ? [{ 'createdBy._id': createdBy }] : []),
			...(tags.length
				? [
						{
							tags: {
								$in: tags,
							},
						},
				  ]
				: []),
			...extraFilter,
		],
	};

	if (!filter.$and.length) {
		filter = {};
	}

	const { cursor, totalCount } = CannedResponse.findPaginated(filter, {
		sort: options.sort || { shortcut: 1 },
		skip: options.offset,
		limit: options.count,
	});
	const [cannedResponses, total] = await Promise.all([cursor.toArray(), totalCount]);
	return {
		cannedResponses: await getTagsInformation(cannedResponses),
		total,
	};
}

export async function findOneCannedResponse({ userId, _id }) {
	if (await hasPermissionAsync(userId, 'view-all-canned-responses')) {
		return CannedResponse.findOneById(_id);
	}

	const accessibleDepartments = await getDepartmentsWhichUserCanAccess(userId);

	const filter = {
		_id,
		$or: [
			{
				scope: 'user',
				userId,
			},
			{
				scope: 'department',
				departmentId: {
					$in: accessibleDepartments,
				},
			},
			{
				scope: 'global',
			},
		],
	};

	return CannedResponse.findOne(filter);
}
