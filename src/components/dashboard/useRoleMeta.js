import { useAuth } from '../../context/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

/** Short line under the user's name: role plus role-specific detail. */
export function useRoleMeta() {
  const { user } = useAuth();
  const { t } = useI18n();
  if (!user) return '';
  const role = t(`roles.${user.role}`);
  if (user.role === 'school') return user.org ? `${role} · ${user.org}` : role;
  if (!user.demo) return role;
  const detail = { student: t('roles.metaStudent'), parent: t('roles.metaParent'), teacher: t('roles.metaTeacher') }[user.role];
  return `${role} · ${detail}`;
}
