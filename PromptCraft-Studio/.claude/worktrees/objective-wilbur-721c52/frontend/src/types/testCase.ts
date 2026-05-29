export interface TestCase {
  id: number;
  projectId: number;
  name: string;
  variablesJson: Record<string, string>;
  expectedOutput?: string;
  createdAt: string;
}

export interface TestCaseDTO {
  name: string;
  variablesJson: Record<string, string>;
  expectedOutput?: string;
}
