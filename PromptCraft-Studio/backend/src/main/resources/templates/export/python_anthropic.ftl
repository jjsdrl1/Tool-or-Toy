import os
import anthropic


def ${functionName}(<#list paramNames as p>${p}<#sep>, </#sep></#list>) -> str:
    client = anthropic.Anthropic(api_key=os.environ["${envVarName}"])
    message = client.messages.create(
        model="${modelName}",
        max_tokens=${maxTokens},
<#if systemPrompt?has_content>
        system=f"${systemPrompt}",
</#if>
        messages=[{"role": "user", "content": f"${userPromptTemplate}"}],
    )
    return message.content[0].text
