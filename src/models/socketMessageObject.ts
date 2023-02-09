import Message from "./message.js";
import Participant from "./participant.js";

interface SocketMessageObject {
	source: string;
	optionsSets: string[];
	isStartOfSession: boolean;
	message: Message;
	conversationSignature: string;
	participant: Participant;
	conversationId: string;
}

export default SocketMessageObject;
