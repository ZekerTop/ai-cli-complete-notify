import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-shell';
import { RELEASES_URL } from '@/lib/update-check.mts';
import type { UpdateViewState } from '@/hooks/useUpdateCheck';
import Panel from './ui/Panel';
import SourceLogo from './ui/SourceLogo';
import { SOURCES } from '@/lib/types';
import GitHubLogo from './ui/GitHubLogo';
import alipayRewardQr from '@/assets/author/alipay-reward.jpg';
import wechatPayRewardQr from '@/assets/author/wechat-pay-reward.jpg';
import wechatContactQr from '@/assets/author/wechat-contact.jpg';

const PROJECT_URL = 'https://github.com/ZekerTop/ai-cli-complete-notify';

interface Props {
  currentVersion: string;
  updateState: UpdateViewState;
  runUpdateCheck: () => Promise<void>;
}

function displayVersion(value: string) {
  const normalized = String(value || '').trim().replace(/^v/i, '');
  return `v${normalized}`;
}

export default function AboutProjectPanel({ currentVersion, updateState, runUpdateCheck }: Props) {
  const { t } = useTranslation();
  const isChecking = updateState.status === 'checking';
  const latestVersion = 'latestVersion' in updateState ? updateState.latestVersion : '';
  const statusText =
    updateState.status === 'checking'
      ? t('aboutProject.update.checking')
      : updateState.status === 'update-available'
        ? t('aboutProject.update.available', { version: displayVersion(updateState.latestVersion) })
        : updateState.status === 'up-to-date'
          ? t('aboutProject.update.upToDate')
          : updateState.status === 'ahead'
            ? t('aboutProject.update.ahead')
            : t('aboutProject.update.error');
  const statusClass =
    updateState.status === 'update-available'
      ? 'text-[rgba(178,188,255,0.96)]'
      : updateState.status === 'up-to-date'
        ? 'text-emerald-300'
        : updateState.status === 'ahead'
          ? 'text-cyan-300'
          : updateState.status === 'error'
            ? 'text-rose-300'
            : 'text-muted';

  return (
    <Panel
      title={t('section.aboutProject.title')}
      subtitle={t('section.aboutProject.sub')}
      badge={<span className="status-pill is-on">{t('aboutProject.badge')}</span>}
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="surface-card p-5">
            <div className="space-y-5">
              <div>
                <p className="sidebar-kicker">{t('aboutProject.projectLabel')}</p>
                <h3 className="display-font mt-3 text-[30px] leading-tight tracking-[-0.02em]">
                  AI CLI Complete Notify
                </h3>
                <p className="mt-3 max-w-[680px] text-sm leading-relaxed text-muted">
                  {t('aboutProject.projectDesc')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="surface-card-soft p-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {t('aboutProject.platformLabel')}
                  </div>
                  <div className="mt-2 text-base font-semibold">{t('aboutProject.platformValue')}</div>
                </div>
                <div className="surface-card-soft p-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {t('aboutProject.sourcesLabel')}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2" data-testid="about-source-logos">
                    {SOURCES.map((source) => (
                      <SourceLogo key={source.key} source={source} name={t(source.titleKey)} className="h-8 w-8" />
                    ))}
                  </div>
                </div>
                <div className="surface-card-soft p-4">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-muted">
                    {t('aboutProject.channelsLabel')}
                  </div>
                  <div className="mt-2 text-base font-semibold">{t('aboutProject.channelsValue')}</div>
                </div>
              </div>

              <div className="border-t border-white/[0.08] pt-5" data-testid="update-check">
                <div>
                  <p className="sidebar-kicker">{t('aboutProject.update.label')}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="text-muted">
                      {t('aboutProject.update.currentVersion')}
                      <span className="ml-2 font-mono font-semibold text-[var(--text)]">
                        {displayVersion(currentVersion)}
                      </span>
                    </span>
                    {latestVersion && (
                      <span className="text-muted">
                        {t('aboutProject.update.latestVersion')}
                        <span className="ml-2 font-mono font-semibold text-[var(--text)]">
                          {displayVersion(latestVersion)}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 min-h-5 text-sm leading-relaxed ${statusClass}`}>{statusText}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void runUpdateCheck()}
                    disabled={isChecking}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-white/[0.24] hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isChecking
                      ? t('aboutProject.update.checkingAction')
                      : t('aboutProject.update.recheck')}
                  </button>

                  {updateState.status === 'update-available' && (
                    <button
                      type="button"
                      onClick={() => void open(updateState.releaseUrl)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(110,123,255,0.36)] bg-[rgba(110,123,255,0.14)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[rgba(110,123,255,0.58)] hover:bg-[rgba(110,123,255,0.2)]"
                    >
                      <GitHubLogo />
                      <span>{t('aboutProject.update.viewRelease')}</span>
                    </button>
                  )}

                  {updateState.status === 'error' && (
                    <button
                      type="button"
                      onClick={() => void open(RELEASES_URL)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[rgba(110,123,255,0.36)] bg-[rgba(110,123,255,0.14)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-[rgba(110,123,255,0.58)] hover:bg-[rgba(110,123,255,0.2)]"
                    >
                      <GitHubLogo />
                      <span>{t('aboutProject.update.viewReleases')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => void open(PROJECT_URL)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.12] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:border-white/[0.24] hover:bg-white/[0.05]"
                  >
                    <GitHubLogo />
                    <span>{t('aboutProject.openProject')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="space-y-4">
              <div>
                <p className="sidebar-kicker">{t('aboutProject.contactLabel')}</p>
                <h3 className="mt-3 text-xl font-semibold">{t('aboutProject.contactTitle')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('aboutProject.contactDesc')}</p>
              </div>
              <div className="rounded-[18px] border border-white/[0.08] bg-white p-3">
                <img
                  src={wechatContactQr}
                  alt={t('aboutProject.wechatContactAlt')}
                  className="mx-auto h-[360px] max-h-[46vh] w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="sidebar-kicker">{t('aboutProject.rewardLabel')}</p>
              <h3 className="mt-3 text-xl font-semibold">{t('aboutProject.rewardTitle')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t('aboutProject.rewardDesc')}</p>
            </div>
            <span className="status-pill">{t('aboutProject.rewardBadge')}</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RewardCode
              title={t('aboutProject.alipayTitle')}
              desc={t('aboutProject.alipayDesc')}
              image={alipayRewardQr}
              alt={t('aboutProject.alipayAlt')}
            />
            <RewardCode
              title={t('aboutProject.wechatPayTitle')}
              desc={t('aboutProject.wechatPayDesc')}
              image={wechatPayRewardQr}
              alt={t('aboutProject.wechatPayAlt')}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}

interface RewardCodeProps {
  title: string;
  desc: string;
  image: string;
  alt: string;
}

function RewardCode({ title, desc, image, alt }: RewardCodeProps) {
  return (
    <div className="surface-card-soft p-4">
      <div className="mb-4">
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
      </div>
      <div className="rounded-[18px] border border-white/[0.08] bg-white p-3">
        <img
          src={image}
          alt={alt}
          className="mx-auto h-[420px] max-h-[52vh] w-full object-contain"
        />
      </div>
    </div>
  );
}
