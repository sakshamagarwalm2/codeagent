import {exec} from "node:child_process";
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function weatherinfo(city){
    return `The weather of ${city} is 23 degree C`
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        } else {
          resolve(`stdout: ${stdout}\nstderr: ${stderr}`);
        }
      });
    });
}

const  Tools_Map={
    weatherinfo: weatherinfo,
    executeCommand: executeCommand,
}

const SYSTEM_PROMT=`
    you are an helpfull ai assistant who is designed to resolve user query.
    you work on START, THINK, ACTION, OBSERVE and OUTPUT Mode.

    In the start phase, user gives a query to you.
    Then, you THINK how to resolve that query atleast 3-4 times and make sure all is clear.
    If there is a need to call a tool, you call an ACTION event with tool and input parameters.
    If there is an action call, wait for the OBSERVE that is output of the tool.
    Based on the OBSERVE from prev step, you either output or repeat the previous step.

    Rules:
    - Aalways wait for next step.
    - Always output a single step and wait for next step.
    - Output must be strictly JSON
    - Only call tool action from Available tools only

    Available Tools
    - weatherinfo(city:string): string
    - executeCommand(command:string): string Executes a given linux command on user's device and return the STDOUT and STDERR

    Example:
    START: What is weather of ajmer?
    THINK: The user is asking for the weather of ajmer.
    THINK: from the available tools, I must call weatherinfo tool for ajmer.
    ACTION: Call tool weatherinfo(ajmer)
    OBSERVE: 23 degree C.
    THINK: The output of weatherinfo for ajmer is 23 degree C.
    OUTPUT: The weather of ajmer is 23 degree C quit sunny Today. 

    Output Example:
    {"role": "user", "content": "What is weather of ajmer?"}
    {"step": "think", "content": "The user is asking for the weather of ajmer."}
    {"step": "think", "content": "from the available tools, I must call weatherinfo tool for ajmer."
    {"step": "action", "tool": "weatherinfo", "input": "ajmer"}
    {"step": "observe", "content": "23 degree C."}
    {"step": "think", "content": "The output of weatherinfo for ajmer is 23 degree C."}
    {"step": "output", "content": "The weather of ajmer is 23 degree C quit sunny Today."}

    Output Formate:
    {"step":"string","tool":"string","input":"string","content":"string"}

`

export async function main() {
    const messages=[
        {
            role: "system",
          content: SYSTEM_PROMT,
        },
    ];
    
    const userQuery = 'Create a folder todo app with HTLM CSS and Js inside the folder only and fully working.'
    messages.push({
        role: "user",
        content: userQuery,
      });
    
    while (true){
        const resonse = await groq.chat.completions.create({
            messages,
            response_format: { type: "json_object" },
            model: "llama-3.3-70b-versatile",
          });
    
        messages.push({
            role: "assistant",
            content: resonse.choices[0]?.message?.content,
          });
        const parsed_response = JSON.parse(resonse.choices[0]?.message?.content);
        if(parsed_response.step === 'output'){
            console.log(`Output: ${parsed_response.content}`)
            break;
        }
        if(parsed_response.step === 'think'){
            console.log(`Think: ${parsed_response.content}`)
            continue;
        }
        if(parsed_response.step === 'action'){
            const tool = parsed_response.tool
            const input= parsed_response.input
    
            const value = await Tools_Map[tool](input)
            console.log(`Action: tool: ${tool}, input: ${input} , value: ${value}`)
            messages.push({
                role: "assistant",
                content: JSON.stringify({
                  step: "observe",
                  content: value,
                }),
              });
            continue;
        }
    
    }
    
}

main();