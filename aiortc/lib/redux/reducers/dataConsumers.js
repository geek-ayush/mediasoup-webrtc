"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const initialState = {};
const dataConsumers = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_ROOM_STATE':
            {
                const roomState = action.payload.state;
                if (roomState === 'closed')
                    return {};
                else
                    return state;
            }
        case 'ADD_DATA_CONSUMER':
            {
                const { dataConsumer } = action.payload;
                return Object.assign(Object.assign({}, state), { [dataConsumer.id]: dataConsumer });
            }
        case 'REMOVE_DATA_CONSUMER':
            {
                const { dataConsumerId } = action.payload;
                const newState = Object.assign({}, state);
                // @ts-ignore
                delete newState[dataConsumerId];
                return newState;
            }
        default:
            {
                return state;
            }
    }
};
exports.default = dataConsumers;
