import { LuDatabase, LuSettings } from 'react-icons/lu';
import { routes } from '../hooks/useHashRoute';
import { hi } from '../strings/hi';
import { Button } from './ui/Button';

/** Ways into "सेटिंग" (language, read aloud) and "मेरा डेटा" (download / delete), from मेरा खेत and the account screen. */
export function MyDataLink() {
  return (
    <div className="flex flex-col gap-1">
      <Button variant="ghost" size="md" icon={LuSettings} onClick={() => (window.location.hash = routes.settings)}>
        {hi.settings.title}
      </Button>
      <Button variant="ghost" size="md" icon={LuDatabase} onClick={() => (window.location.hash = routes.myData)}>
        {hi.myData.title}
      </Button>
    </div>
  );
}
