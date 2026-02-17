import { toPascalCase } from '../../utils/naming';
import { toKebabCase } from '../../utils/naming';

export function dataHookTemplate(name: string): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const upperName = name.replace(/-/g, '_').toUpperCase();

  return `// ${pascalName} Data Hook
// Fetches server state using React Query.
// Returns raw data — no formatting, no interpretation.

// import { useQuery } from '@tanstack/react-query';
// import { ServiceFactory } from '../../../infrastructure/ServiceFactory';
// import { get${pascalName}List, get${pascalName}ById } from '../methods/${kebabName}-logic';

/**
 * Fetch the ${name} list
 */
export const use${pascalName}Data = () => {
  // const service = ServiceFactory.create('${upperName}');

  // const listQuery = useQuery({
  //   queryKey: ['${kebabName}', 'list'],
  //   queryFn: () => get${pascalName}List(service),
  // });

  return {
    // items: listQuery.data ?? [],
    // isLoading: listQuery.isLoading,
    // error: listQuery.error,
    // refetch: listQuery.refetch,
  };
};
`;
}
