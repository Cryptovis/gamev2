import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { ManagedDialog } from '../windows/ManagedDialog';
import { WINDOW_LAYERS } from '../windows/useWindowLifecycle';

interface StoreModalProps {
  onClose: () => void;
}

export function StoreModal({ onClose }: StoreModalProps) {
  const [tab, setTab] = useState<'vip' | 'gold'>('vip');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showComingSoon = (feature: string) => {
    setToastMessage(translateLive(`Coming soon! Purchases will be enabled in the upcoming update.`));
  };

  const node = (
    <div className="store-modal-backdrop" onMouseDown={(e) => { e.preventDefault(); onClose(); }}>
      <ManagedDialog
        enabled={true}
        className="store-modal-dialog"
        label={translateLive('Presidential Store')}
        onClose={onClose}
        layer={WINDOW_LAYERS.modal}
      >
        <header className="store-modal-header">
          <div className="store-header-title">
            <span className="store-crown-icon" aria-hidden="true">👑</span>
            <div>
              <h2><LocaleText value="PRESIDENTIAL STORE" /></h2>
              <p><LocaleText value="VIP privileges, cloud sync and sovereign gold reserves." /></p>
            </div>
          </div>
          <button
            className="store-modal-close"
            onClick={onClose}
            aria-label={translateLive('Close store')}
          >
            <LocaleText value="×" />
          </button>
        </header>

        <div className="store-modal-nav">
          <button
            className={`store-nav-tab ${tab === 'vip' ? 'active' : ''}`}
            onClick={() => setTab('vip')}
          >
            <span aria-hidden="true">💎</span>
            <LocaleText value="VIP Membership" />
          </button>
          <button
            className={`store-nav-tab ${tab === 'gold' ? 'active' : ''}`}
            onClick={() => setTab('gold')}
          >
            <span aria-hidden="true">🪙</span>
            <LocaleText value="Gold Bullion Packs" />
          </button>
        </div>

        <div className="store-modal-body">
          {tab === 'vip' && (
            <div className="store-vip-view">
              <div className="store-vip-hero">
                <div className="store-vip-banner">
                  <span className="store-vip-tag"><LocaleText value="PREMIUM EXECUTIVE ACCESS" /></span>
                  <h3><LocaleText value="Unlock Full Presidential Privileges" /></h3>
                  <p><LocaleText value="Elevate your command experience with multi-device cloud synchronization and deep profile customization." /></p>
                </div>
              </div>

              <div className="store-vip-tiers">
                <div className="vip-tier-card">
                  <div className="vip-tier-badge"><LocaleText value="MONTHLY PASS" /></div>
                  <div className="vip-tier-price">
                    <span className="currency">$</span>
                    <span className="amount">4.99</span>
                    <span className="period"><LocaleText value="/month" /></span>
                  </div>
                  <p><LocaleText value="Flexible access to all VIP privileges, cancellable at any time." /></p>
                  <button
                    className="vip-buy-btn secondary"
                    onClick={() => showComingSoon('monthly_vip')}
                  >
                    <LocaleText value="Subscribe" />
                  </button>
                </div>

                <div className="vip-tier-card featured">
                  <div className="vip-tier-badge highlight"><LocaleText value="BEST VALUE · LIFETIME" /></div>
                  <div className="vip-tier-price">
                    <span className="currency">$</span>
                    <span className="amount">29.99</span>
                    <span className="period"><LocaleText value="one-time" /></span>
                  </div>
                  <p><LocaleText value="Permanent founder membership. Unlimited access to all current and future VIP expansions forever." /></p>
                  <button
                    className="vip-buy-btn primary"
                    onClick={() => showComingSoon('lifetime_vip')}
                  >
                    <LocaleText value="Unlock Lifetime Access" />
                  </button>
                </div>
              </div>

              <div className="store-vip-features">
                <h4><LocaleText value="VIP Package Privileges" /></h4>
                <ul className="store-feature-list">
                  <li>
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <div>
                      <strong><LocaleText value="Cloud Save Synchronization" /></strong>
                      <small><LocaleText value="Save and seamlessly continue your campaign across all your devices." /></small>
                    </div>
                  </li>
                  <li>
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <div>
                      <strong><LocaleText value="Custom Portrait Upload & Frames" /></strong>
                      <small><LocaleText value="Upload your own presidential portrait and unlock prestige golden frames." /></small>
                    </div>
                  </li>
                  <li>
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <div>
                      <strong><LocaleText value="Ideology & Governance Pivot" /></strong>
                      <small><LocaleText value="Switch national ruling ideology dynamically mid-campaign without constitutional crisis." /></small>
                    </div>
                  </li>
                  <li>
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <div>
                      <strong><LocaleText value="Credentials & Archetype Respec" /></strong>
                      <small><LocaleText value="Modify leader starting perks and executive background at any time." /></small>
                    </div>
                  </li>
                  <li>
                    <span className="feature-check" aria-hidden="true">✓</span>
                    <div>
                      <strong><LocaleText value="Priority Simulation Engine" /></strong>
                      <small><LocaleText value="Dedicated Web Worker multi-threading priority for blazing fast turn calculations." /></small>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'gold' && (
            <div className="store-gold-view">
              <div className="store-gold-intro">
                <div className="store-gold-banner">
                  <span className="store-gold-tag"><LocaleText value="NATIONAL SOVEREIGN RESERVES" /></span>
                  <h3><LocaleText value="Strategic Gold Bullion Reserves" /></h3>
                  <p><LocaleText value="Emergency bullion allocations deposited straight into your national treasury vault for financial flexibility." /></p>
                </div>
              </div>

              <div className="store-gold-grid">
                {[
                  { id: 'g10', amount: 10, bonus: '+$5.0B', price: '$0.99', label: '10 Gold Bullions' },
                  { id: 'g50', amount: 50, bonus: '+$25.0B', price: '$3.99', label: '50 Gold Bullions', popular: true },
                  { id: 'g100', amount: 100, bonus: '+$60.0B', price: '$6.99', label: '100 Gold Bullions', bestValue: true },
                  { id: 'g1000', amount: 1000, bonus: '+$750.0B', price: '$49.99', label: '1,000 Gold Bullions' },
                  { id: 'g10000', amount: 10000, bonus: '+$10,000.0B', price: '$299.99', label: '10,000 Gold Bullions', imperial: true },
                ].map((pack) => (
                  <div key={pack.id} className={`store-gold-card ${pack.popular ? 'popular' : ''} ${pack.bestValue ? 'best-value' : ''} ${pack.imperial ? 'imperial' : ''}`}>
                    {pack.popular && <span className="gold-ribbon"><LocaleText value="POPULAR" /></span>}
                    {pack.bestValue && <span className="gold-ribbon best"><LocaleText value="BEST VALUE" /></span>}
                    {pack.imperial && <span className="gold-ribbon imperial"><LocaleText value="IMPERIAL" /></span>}
                    <div className="gold-card-icon" aria-hidden="true">🪙</div>
                    <div className="gold-card-info">
                      <h4><LocaleText value={pack.label} /></h4>
                      <span className="gold-card-bonus"><LocaleText value="Treasury Yield" />: <strong>{pack.bonus}</strong></span>
                    </div>
                    <div className="gold-card-action">
                      <span className="gold-price-tag">{pack.price}</span>
                      <button
                        className="gold-buy-btn"
                        onClick={() => showComingSoon(pack.id)}
                      >
                        <LocaleText value="PURCHASE" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {toastMessage && (
          <div className="store-toast" role="alert">
            <div className="store-toast-content">
              <span className="store-toast-icon" aria-hidden="true">🚀</span>
              <p><LocaleText value={toastMessage} /></p>
              <button
                className="store-toast-close"
                onClick={() => setToastMessage(null)}
              >
                <LocaleText value="OK" />
              </button>
            </div>
          </div>
        )}

        <footer className="store-modal-footer">
          <small><LocaleText value="All digital goods are tied to your commander identity. No recurring fees without active subscription." /></small>
          <button className="store-footer-done" onClick={onClose}>
            <LocaleText value="CLOSE STORE" />
          </button>
        </footer>
      </ManagedDialog>
    </div>
  );

  return typeof document === 'undefined' ? node : createPortal(node, document.body);
}
