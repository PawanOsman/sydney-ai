import ChatBot from '../dist/index.js';
import { config } from "dotenv";
import readline from "readline";
config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const bot = new ChatBot(process.env.TOKEN);

async function main() {
    while (true) {
        let prompt = await new Promise((resolve) => {
            rl.question("You: ", (answer) => {
                resolve(answer);
            });
        });

        process.stdout.write("SydneyAI: ");
        await bot.askStream(res => {
            process.stdout.write(res.toString());
        }, prompt);
        console.log();
    }
}

main();