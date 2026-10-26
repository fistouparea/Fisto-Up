import { LuDatabase } from 'react-icons/lu';
import { routes } from '../hooks/useHashRoute';
import { hi } from '../strings/hi';
import { Button } from './ui/Button';

/** Way into "मेरा डेटा" (download / delete), from मेरा खेत and the account screen. */
export function MyDataLink() {
  return (
    <Button variant="ghost" size="md" icon={LuDatabase} onClick={() => (window.location.hash = routes.myData)}>
      {hi.myData.title}
    </Button>
  );
}
