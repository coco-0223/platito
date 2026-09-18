import { dishService } from '@/lib/services/dishService';
import { StorefrontView } from '@/components/storefront/StorefrontView';

export const dynamic = 'force-dynamic';

export default async function VitrinaPage() {
  const dishes = await dishService.getAvailableCustomerDishes(20);

  return (
    <StorefrontView dishes={dishes} />
  );
}
