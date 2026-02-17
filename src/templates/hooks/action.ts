import { toPascalCase } from '../../utils/naming';
import { toKebabCase } from '../../utils/naming';

export function actionHookTemplate(name: string): string {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);
  const upperName = name.replace(/-/g, '_').toUpperCase();

  return `// ${pascalName} Action Hook
// Provides mutation actions for the ${name} domain.
// Each action wraps a domain method with React Query's useMutation.

// import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { ServiceFactory } from '../../../infrastructure/ServiceFactory';
// import { create${pascalName}, update${pascalName}, delete${pascalName} } from '../methods/${kebabName}-logic';

export const use${pascalName}Action = () => {
  // const queryClient = useQueryClient();
  // const service = ServiceFactory.create('${upperName}');

  // const createMutation = useMutation({
  //   mutationFn: (data: unknown) => create${pascalName}(service, data),
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${kebabName}'] }),
  // });

  // const updateMutation = useMutation({
  //   mutationFn: ({ id, data }: { id: string; data: unknown }) =>
  //     update${pascalName}(service, id, data),
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${kebabName}'] }),
  // });

  // const deleteMutation = useMutation({
  //   mutationFn: (id: string) => delete${pascalName}(service, id),
  //   onSuccess: () => queryClient.invalidateQueries({ queryKey: ['${kebabName}'] }),
  // });

  return {
    // create: createMutation.mutateAsync,
    // update: updateMutation.mutateAsync,
    // remove: deleteMutation.mutateAsync,
    // isCreating: createMutation.isPending,
    // isUpdating: updateMutation.isPending,
    // isDeleting: deleteMutation.isPending,
  };
};
`;
}
