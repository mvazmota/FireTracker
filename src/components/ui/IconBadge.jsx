

export default function IconBadge({ icon: Icon, color }) {
  return <span className="transaction-icon" style={{ '--icon-color': color }}><Icon size={18} strokeWidth={1.8} /></span>
}
