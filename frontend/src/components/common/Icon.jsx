export default function Icon({ icon: IconComp, size = 18, className = '' }) {
    return <IconComp size={size} strokeWidth={1.5} className={className} />;
}
