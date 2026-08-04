type AdminTopbarProps = {
  title: string;
  description?: string;
};

export default function AdminTopbar({ title, description }: AdminTopbarProps) {
  return (
    <header className="h-[78px] bg-white border-b border-[#e8dcc2] px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-[22px] font-extrabold text-[#20170f]">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>

      <div className="w-11 h-11 rounded-full bg-[#b98218] text-white flex items-center justify-center font-bold">
        AD
      </div>
    </header>
  );
}