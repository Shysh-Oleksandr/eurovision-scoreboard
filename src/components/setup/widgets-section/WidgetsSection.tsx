import ContestsWidget from './contests/ContestsWidget';
import ThemesWidget from './custom-themes/ThemesWidget';
import ProfileWidget from './profile/ProfileWidget';

const WidgetsSection = () => {
  return (
    <div className="flex gap-2 overflow-x-auto narrow-scrollbar w-full mt-1">
      <ProfileWidget />
      <ThemesWidget />
      <ContestsWidget />
    </div>
  );
};

export default WidgetsSection;
