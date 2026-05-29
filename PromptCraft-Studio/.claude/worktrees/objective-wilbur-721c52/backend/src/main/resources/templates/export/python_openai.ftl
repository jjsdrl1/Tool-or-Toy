import os
from openai import OpenAI


def ${functionName}(<#list paramNames as p>${p}<#sep>, </#sep></#list>) -> str:
    client = OpenAI(
        api_key=os.environ["${envVarName}"],
        base_url="${baseUrl}",
    )
    response = client.chat.completions.create(
        model="${modelName}",
        temperature=${temperature},
        max_tokens=${maxTokens},
        messages=[
<#if systemPrompt?has_content>
            {"role": "system", "content": f"${systemPrompt}"},
</#if>
            {"role": "user", "content": f"${userPromptTemplate}"},
        ],
    )
    return response.choices[0].message.content
