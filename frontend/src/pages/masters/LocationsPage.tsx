import { z } from 'zod';
import { MasterPage } from '@/components/common/MasterPage';
import { locationService } from '@/services/master.service';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().default('India'),
  pincode: z.string().optional(),
  address: z.string().optional(),
});
const updateSchema = createSchema.partial();

export function LocationsPage() {
  return (
    <MasterPage
      title="Location"
      description="Manage office locations and plants"
      queryKey="locations"
      service={locationService as any}
      createSchema={createSchema}
      updateSchema={updateSchema}
      fields={[
        { name: 'name', label: 'Location Name', required: true, placeholder: 'e.g. Bangalore HQ' },
        { name: 'city', label: 'City', required: true, placeholder: 'e.g. Bangalore' },
        { name: 'state', label: 'State', required: true, placeholder: 'e.g. Karnataka' },
        { name: 'country', label: 'Country', placeholder: 'India' },
        { name: 'pincode', label: 'Pincode', placeholder: '560001' },
        { name: 'address', label: 'Address', type: 'textarea', colSpan: true },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'country', label: 'Country' },
      ]}
    />
  );
}
