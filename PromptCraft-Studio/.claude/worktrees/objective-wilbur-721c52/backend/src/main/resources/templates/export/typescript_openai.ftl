import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.${envVarName},
  baseURL: '${baseUrl}',
});

export async function ${functionName}(<#list paramNames as p>${p}: string<#sep>, </#sep></#list>): Promise<string> {
  const response = await client.chat.completions.create({
    model: '${modelName}',
    temperature: ${temperature},
    max_tokens: ${maxTokens},
    messages: [
<#if systemPrompt?has_content>
      { role: 'system', content: `${systemPrompt}` },
</#if>
      { role: 'user', content: `${userPromptTemplate}` },
    ],
  });
  return response.choices[0].message.content ?? '';
}
