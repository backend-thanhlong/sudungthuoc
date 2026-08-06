export class AIProviderError extends Error {
    code: string;
    status?: number;

    constructor(code: string, message: string, status?: number) {
        super(message);
        this.name = "AIProviderError";
        this.code = code;
        this.status = status;
    }
}
