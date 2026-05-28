import { AgentToolCall, AgentToolDefinition } from '../../types/agent';

type JsonSchema = Record<string, unknown>;

export interface ToolValidationError {
    code: 'UNKNOWN_FIELD' | 'MISSING_REQUIRED' | 'INVALID_TYPE' | 'INVALID_ENUM';
    message: string;
}

function typeOfValue(value: unknown): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    return typeof value;
}

function validateValue(schema: JsonSchema, value: unknown, path: string): ToolValidationError | null {
    const expectedType = schema.type;
    if (typeof expectedType === 'string' && expectedType !== 'object') {
        if (expectedType === 'number' && typeof value !== 'number') {
            return { code: 'INVALID_TYPE', message: `${path} 应为 number` };
        }
        if (expectedType === 'string' && typeof value !== 'string') {
            return { code: 'INVALID_TYPE', message: `${path} 应为 string` };
        }
        if (expectedType === 'boolean' && typeof value !== 'boolean') {
            return { code: 'INVALID_TYPE', message: `${path} 应为 boolean` };
        }
        if (expectedType === 'array' && !Array.isArray(value)) {
            return { code: 'INVALID_TYPE', message: `${path} 应为 array` };
        }
    }

    const enumValues = schema.enum;
    if (Array.isArray(enumValues) && !enumValues.includes(value)) {
        return { code: 'INVALID_ENUM', message: `${path} 不在允许值中` };
    }

    return null;
}

export function validateToolArguments(definition: AgentToolDefinition, call: AgentToolCall): ToolValidationError | null {
    const schema = definition.parameters || {};
    if (schema.type !== 'object') return null;

    const args = call.arguments && typeof call.arguments === 'object' && !Array.isArray(call.arguments)
        ? call.arguments as Record<string, unknown>
        : {};
    const properties = schema.properties && typeof schema.properties === 'object'
        ? schema.properties as Record<string, JsonSchema>
        : {};
    const required = Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : [];

    for (const field of required) {
        if (!(field in args)) {
            return { code: 'MISSING_REQUIRED', message: `${call.name} 缺少必填参数 ${field}` };
        }
    }

    if (schema.additionalProperties === false) {
        for (const field of Object.keys(args)) {
            if (!(field in properties)) {
                return { code: 'UNKNOWN_FIELD', message: `${call.name} 不接受未知参数 ${field}` };
            }
        }
    }

    for (const [field, value] of Object.entries(args)) {
        const fieldSchema = properties[field];
        if (!fieldSchema) continue;
        const error = validateValue(fieldSchema, value, `${call.name}.${field}`);
        if (error) {
            return {
                ...error,
                message: `${error.message}，实际为 ${typeOfValue(value)}`,
            };
        }
    }

    return null;
}
