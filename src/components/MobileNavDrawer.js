export default function MobileNavDrawer({ items, onClose }) {
  return (
    <div className="ph-mobile-overlay" onClick={onClose}>
      <div className="ph-mobile-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="ph-mobile-close" onClick={onClose}>✕</button>
        {items.map((item, i) =>
          item === "separator" ? (
            <div key={i} className="ph-mobile-nav-separator" />
          ) : (
            <button
              key={i}
              className={`ph-mobile-nav-btn${item.danger ? " ph-mobile-nav-btn-danger" : ""}${item.active ? " ph-mobile-nav-btn-active" : ""}`}
              onClick={() => { item.onClick(); onClose(); }}
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}
