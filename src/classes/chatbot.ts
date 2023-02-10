import Options from "../models/options.js";
import Conversation from "./conversation.js";
import SocketMessageObject from "../models/socketMessageObject.js";
import Status from "../enums/status.js";

class ChatBot {
	public token: string;
	public options: Options;
	public conversations: Conversation[] = [];

	constructor(token: string, options?: Options) {
		this.token = token;
		this.options = {
			revProxy: options?.revProxy,
		};
	}

	public async addConversation(conversationId: string) {
		let conversation = new Conversation(conversationId, this.token, this.options.revProxy);
		await conversation.waitForReady();
		this.conversations.push(conversation);
		return conversation;
	}

	public async getConversation(conversationId: string) {
		let conversation = this.conversations.find((conversation) => conversation.id === conversationId);
		if (!conversation) {
			conversation = await this.addConversation(conversationId);
		} else {
			conversation.lastActivity = Date.now();
		}

		return conversation;
	}

	public async ask(prompt: string, conversationId: string = "default") {
		let conversation = await this.getConversation(conversationId);

		if (conversation.status === Status.Inactive) throw new Error("Conversation is inactive");
		if (conversation.status === Status.Busy) throw new Error("Conversation is busy");

		conversation.status = Status.Busy;

		let request: SocketMessageObject = {
			source: "cib",
			conversationId: conversation.conversationId,
			conversationSignature: conversation.conversationSignature,
			isStartOfSession: conversation.isStartOfSession,
			message: {
				author: "user",
				text: prompt,
				inputMethod: "Keyboard",
				messageType: "Chat",
			},
			participant: {
				id: conversation.clientId,
			},
			optionsSets: ["nlu_direct_response_filter", "deepleo", "enable_debug_commands", "disable_emoji_spoken_text", "responsible_ai_policy_235", "enablemm"],
		};

		conversation.isStartOfSession = false;

		return await new Promise<string>((resolve) => {
			conversation.connection.stream("chat", request).subscribe({
				next: (item) => {
					resolve(item.messages[1].text);
					conversation.status = Status.Idle;
				},
				complete: () => {},
				error: (error) => {
					console.error(error);
				},
			});
		});
	}

	public async askStream(data: (arg0: string) => void, prompt: string, conversationId: string = "default") {
		let conversation = await this.getConversation(conversationId);

		if (conversation.status === Status.Inactive) {
			await conversation.connect();
		}

		if (conversation.status === Status.Busy) throw new Error("Conversation is busy");

		conversation.status = Status.Busy;

		let request: SocketMessageObject = {
			source: "cib",
			conversationId: conversation.conversationId,
			conversationSignature: conversation.conversationSignature,
			isStartOfSession: conversation.isStartOfSession,
			message: {
				author: "user",
				text: prompt,
				inputMethod: "Keyboard",
				messageType: "Chat",
			},
			participant: {
				id: conversation.clientId,
			},
			optionsSets: ["nlu_direct_response_filter", "deepleo", "enable_debug_commands", "disable_emoji_spoken_text", "responsible_ai_policy_235", "enablemm"],
		};

		conversation.isStartOfSession = false;

		let currentMessage = "";

		conversation.connection.on("update", (value) => {
			let chunk = value.messages[0].text.replace(currentMessage, "");
			if (chunk.length > 0 && chunk !== "\n") {
				currentMessage = value.messages[0].text;
				data(chunk);
			}
		});

		return await new Promise<string>((resolve) => {
			conversation.connection.stream("chat", request).subscribe({
				next: (item) => {
					resolve(item.messages[1].text);
					conversation.status = Status.Idle;
					conversation.connection.off("update");
				},
				complete: () => {},
				error: (error) => {
					console.error(error);
				},
			});
		});
	}
}

export default ChatBot;
