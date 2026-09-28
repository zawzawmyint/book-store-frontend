import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: process.env.GRAPHQL_SCHEMA_URL || 'http://127.0.0.1:4000/graphql',
  documents: 'src/operations.graphql',
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript-operations', 'typed-document-node'],
      config: { useTypeImports: true },
    },
  },
}

export default config
