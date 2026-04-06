import "server-only";

type GeminiGenerateTextInput = {
  apiKey: string;
  model: string;
  prompt: string;
};

type GeminiModelListItem = {
  description?: string;
  displayName?: string;
  name?: string;
  supportedGenerationMethods?: string[];
};

type GeminiModelListResponse = {
  models?: GeminiModelListItem[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export type GeminiModelOption = {
  description: string | null;
  label: string;
  value: string;
};

function resolveGeminiModelValue(model: GeminiModelListItem) {
  const rawName = model.name?.trim() || "";
  return rawName.startsWith("models/") ? rawName.slice("models/".length) : rawName;
}

export async function listGeminiModels(apiKey: string): Promise<GeminiModelOption[]> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
    {
      headers: {
        "x-goog-api-key": apiKey,
      },
    }
  );

  const payload = (await response.json()) as GeminiModelListResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Não foi possível listar os modelos do Gemini.");
  }

  const options = (payload.models ?? [])
    .filter((model) => (model.supportedGenerationMethods ?? []).includes("generateContent"))
    .map((model) => {
      const value = resolveGeminiModelValue(model);

      return {
        description: model.description?.trim() || null,
        label: model.displayName?.trim() || value,
        value,
      };
    })
    .filter((model) => Boolean(model.value));

  return Array.from(new Map(options.map((model) => [model.value, model])).values()).sort((left, right) =>
    left.label.localeCompare(right.label, "pt-BR")
  );
}

export async function generateGeminiText({
  apiKey,
  model,
  prompt,
}: GeminiGenerateTextInput): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
        },
      }),
    }
  );

  const payload = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Não foi possível obter uma resposta do Gemini.");
  }

  const text = (payload.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text?.trim() || "")
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!text) {
    throw new Error("O Gemini não retornou texto para esta solicitação.");
  }

  return text;
}
