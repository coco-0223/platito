import { dishService } from '@/lib/services/dishService';
import { ProviderDashboard } from '@/components/provider/ProviderDashboard';

export const dynamic = 'force-dynamic';

export default async function ProviderPage() {
  const initialDishes = await dishService.getDishes();
  
  return (
    <ProviderDashboard initialDishes={initialDishes} />
  );
}
