import Result from "./result";

interface SydneyConversation {
	conversationSignature: string;
	conversationId: string;
	clientId: string;
	result: Result;
}

export default SydneyConversation;
