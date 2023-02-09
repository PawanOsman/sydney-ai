import axios from "axios";
import crypto from "crypto";
import signalR from "@microsoft/signalr";
import Options from "../models/options.js";
import Conversation from "../models/conversation.js";
import SocketMessageObject from "../models/socketMessageObject.js";

class ChatBot {
	public token: string;
	public options: Options;
	public connection: signalR.HubConnection;
	public conversations: Conversation[] = [];
	constructor(token: string, options?: Options) {
		this.token = token;
		this.options = {};

		this.connection = new signalR.HubConnectionBuilder().withUrl("https://sydney.bing.com/sydney/ChatHub").build();

		this.connection.on("send", (data) => {
			console.log(data);
		});

		this.connection.start();
	}

	public async createConversation(): Promise<Conversation> {
		let response = await axios.post("https://www.bing.com/turing/conversation/create", {
			headers: {
				accept: "application/json",
				"content-type": "application/json",
				"x-ms-client-request-id": crypto.randomUUID(),
				"x-ms-useragent": "azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.10.0 OS/Win32",
				cookie: `_U=${this.token}`,
				Referer: "https://www.bing.com/search?q=Bing+AI&showconv=1&FORM=hpcodx&iscopilotedu=1&form=MA13GA",
			},
		});

		return {
			conversationSignature: response.data.conversationSignature,
			conversationId: response.data.conversationId,
			clientId: response.data.clientId,
		};
	}

	public async addConversation(conversationId: string) {
		let conversation = await this.createConversation();
		conversation.id = conversationId;
		conversation.lastActivity = Date.now();
		conversation.isStartOfSession = true;
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

	public async sendMessage(prompt: string, conversationId: string = "default") {
		let conversation = await this.getConversation(conversationId);
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
		return await this.connection.invoke("chat", request);
	}
}

export default ChatBot;
