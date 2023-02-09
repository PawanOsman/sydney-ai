interface Conversation {
	id?: string;
	conversationSignature: string;
	conversationId: string;
	clientId: string;
	lastActivity?: number;
	isStartOfSession?: boolean;
}

export default Conversation;
