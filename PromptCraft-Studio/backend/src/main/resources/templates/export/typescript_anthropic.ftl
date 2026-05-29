import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.${envVarName} });

export async function ${functionName}(<#list paramNames as p>${p}: string<#sep>, </#sep></#list>): Promise<string> {
  const message = await client.messages.create({
    model: '${modelName}',
    max_tokens: ${maxTokens},
<#if systemPrompt?has_content>
    system: `${systemPrompt}`,
</#if>
    messages: [{ role: 'user', content: `${userPromptTemplate}` }],
  });
  return (message.content[0] as Anthropic.TextBlock).text;
}
