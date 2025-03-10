import { isRoomFederated } from '@rocket.chat/core-typings';
import { useSetting } from '@rocket.chat/ui-contexts';
import { useMemo, useCallback } from 'react';

import { addAction } from '../../../client/views/room/lib/Toolbox';
import { sdk } from '../../utils/client/lib/SDKClient';

addAction('webRTCVideo', ({ room }) => {
	const enabled = useSetting('WebRTC_Enabled') && useSetting('Omnichannel_call_provider') === 'WebRTC' && room.servedBy;
	const federated = isRoomFederated(room);

	const handleClick = useCallback(async (): Promise<void> => {
		if (!room.callStatus || room.callStatus === 'declined' || room.callStatus === 'ended') {
			await sdk.rest.get('/v1/livechat/webrtc.call', { rid: room._id });
		}
		window.open(`/meet/${room._id}`, room._id);
	}, [room._id, room.callStatus]);

	return useMemo(
		() =>
			enabled
				? {
						groups: ['live'],
						id: 'webRTCVideo',
						title: 'WebRTC_Call',
						icon: 'phone',
						...(federated && {
							'data-tooltip': 'Call_unavailable_for_federation',
							'disabled': true,
						}),
						action: handleClick,
						full: true,
						order: 4,
				  }
				: null,
		[enabled, handleClick, federated],
	);
});
