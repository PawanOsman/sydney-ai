import axios from "axios";
import crypto from "crypto";
import { HubConnection, HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import wait from "../utils/wait.js";
import SydneyConversation from "../models/sydney-conversation.js";
import Status from "../enums/status.js";

class Conversation {
	public id: string;
	public token: string;
	public revProxy?: string;
	public connection: HubConnection;
	public conversationSignature: string;
	public conversationId: string;
	public clientId: string;
	public lastActivity: number;
	public isStartOfSession: boolean = true;
	public isConnected: boolean = false;
	public isConversationCreated = false;
	public status: Status = Status.Inactive;

	constructor(id: string, token: string, revProxy?: string) {
		this.id = id;
		this.token = token;
		this.revProxy = revProxy;
		this.lastActivity = Date.now();

		this.resetConversation()
			.then(async (data) => {
				if (data.result.message) throw new Error(data.result.message);
				this.conversationSignature = data.conversationSignature;
				this.conversationId = data.conversationId;
				this.clientId = data.clientId;
				await wait(50);
				this.isConversationCreated = true;

				this.connection = new HubConnectionBuilder()
					.withUrl("https://sydney.bing.com/sydney/ChatHub", {
						skipNegotiation: true,
						transport: HttpTransportType.WebSockets,
					})
					.configureLogging(LogLevel.None)
					.build();

				this.connection.onclose(() => {
					this.isConnected = false;
				});

				this.connection.start().then(() => {
					this.isConnected = true;
					this.status = Status.Idle;
				});
			})
			.catch(console.error);
	}

	public async connect() {
		if (!this.isConnected) {
			await this.connection.start();
			this.isConnected = true;
			this.status = Status.Idle;
		}
	}

	public async disconnect() {
		if (this.isConnected) {
			await this.connection.stop();
			this.isConnected = false;
			this.status = Status.Inactive;
		}
	}

	public async waitForReady() {
		while (true) {
			if (this.isConversationCreated) {
				if (this.isConnected) {
					return;
				}
			}

			await wait(100);
		}
	}

	public async resetConversation(): Promise<SydneyConversation> {
		let response = await axios.get<SydneyConversation>(this.revProxy ?? "https://www.bing.com/turing/conversation/create", {
			headers: {
				accept: "application/json",
				"content-type": "application/json",
				"x-ms-client-request-id": crypto.randomUUID(),
				"x-ms-useragent": "azsdk-js-api-client-factory/1.0.0-beta.1 core-rest-pipeline/1.10.0 OS/Win32",
				cookie: `_U=${this.token}`,
				Referer: "https://www.bing.com/search?q=Bing+AI&showconv=1&FORM=hpcodx&iscopilotedu=1&form=MA13GA",
			},
		});

		return response.data;
	}
}

export default Conversation;
