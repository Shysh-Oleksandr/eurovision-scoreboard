import React, { useState } from 'react';
import { toast } from 'react-toastify';

import ThemeListItem from './ThemeListItem';
import ThemesSearchHeader from './ThemesSearchHeader';

import { api } from '@/api/client';
import {
  useApplyThemeMutation,
  useDeleteThemeMutation,
  useMyThemesQuery,
} from '@/api/themes';
import Button from '@/components/common/Button';
import GoogleAuthButton from '@/components/common/GoogleAuthButton';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { CustomTheme } from '@/types/customTheme';

interface UserThemesProps {
  onLoaded?: () => void;
  onCreateNew?: () => void;
  onEdit?: (theme: CustomTheme) => void;
  onDuplicate: (theme: CustomTheme) => void;
}

const UserThemes: React.FC<UserThemesProps> = ({
  onCreateNew,
  onEdit,
  onDuplicate,
}) => {
  const user = useAuthStore((state) => state.user);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'likes'>('createdAt');

  const { data: themes, isLoading } = useMyThemesQuery(!!user);
  const { mutateAsync: deleteTheme } = useDeleteThemeMutation();
  const { mutateAsync: applyThemeToProfile } = useApplyThemeMutation();
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);

  const handleApply = async (theme: CustomTheme) => {
    try {
      // Fetch the latest version before applying
      const { data: latest } = await api.get(`/themes/${theme._id}`);

      // Apply locally (immediate)
      applyCustomTheme(latest);

      // Save to profile (sync across devices)
      if (user) {
        await applyThemeToProfile(theme._id);
      }

      toast.success(`Theme "${latest.name}" applied!`);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || 'Failed to save theme to profile',
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTheme(id);
      toast.success('Theme deleted successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete theme');
    }
  };

  // Filter and sort themes
  const filteredThemes = themes
    ?.filter((theme) =>
      theme.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === 'createdAt') {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      return b.likes - a.likes;
    });

  if (isLoading) {
    return (
      <div className="text-white text-center py-8">Loading your themes...</div>
    );
  }

  if (!user) {
    return (
      <div className="text-white text-center sm:py-8 py-4 flex flex-col items-center gap-4">
        <p className="text-white/70">
          Authenticate to view and create your own themes
        </p>
        <GoogleAuthButton />
      </div>
    );
  }

  return (
    <div className="sm:space-y-4 space-y-2">
      {/* Top bar */}
      <ThemesSearchHeader
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onCreateNew={onCreateNew}
      />

      <h3 className="text-white text-lg font-bold">
        {search.trim() ? 'Found' : 'You have'} {filteredThemes?.length}{' '}
        {filteredThemes?.length === 1 ? 'theme' : 'themes'}
      </h3>

      {/* Theme list */}
      {filteredThemes && filteredThemes.length > 0 ? (
        <div className="grid gap-4">
          {filteredThemes.map((theme) => (
            <ThemeListItem
              key={theme._id}
              theme={theme}
              variant="user"
              onEdit={onEdit}
              onDelete={handleDelete}
              onApply={handleApply}
              isApplied={currentCustomTheme?._id === theme._id}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">
            {search
              ? 'No themes found matching your search.'
              : 'No themes yet. Create your first theme!'}
          </p>
          {!search && (
            <Button variant="tertiary" onClick={onCreateNew}>
              Create Theme
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserThemes;
