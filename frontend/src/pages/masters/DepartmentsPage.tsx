import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { departmentService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').max(10),
  description: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function DepartmentsPage() {
  return (
    <MasterPage
      title="Department"
      description="Manage company departments"
      queryKey="departments"
      service={departmentService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Department Name', required: true, placeholder: 'e.g. Engineering' },
        { name: 'code', label: 'Code', required: true, placeholder: 'e.g. ENG' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: true, placeholder: 'Optional description' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
      ]}
    />
  );
}
