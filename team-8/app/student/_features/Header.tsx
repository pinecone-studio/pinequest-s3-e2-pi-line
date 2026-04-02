import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NotificationBell from "@/components/NotificationBell";

export default function Header() {
  return (
    <header className="hidden h-[49px] w-full shrink-0 md:flex md:items-start md:justify-between">
      <div
        style={{
          width: "344px",
          height: "49px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <p
          style={{
            fontSize: "22px",
            fontWeight: 500,
            lineHeight: "120%",
            color: "#000000",
            margin: 0,
          }}
        >
          Сайн байна уу, Намуун
        </p>

        <p
          style={{
            fontSize: "15px",
            fontWeight: 400,
            lineHeight: "120%",
            color: "#6B6B6B",
            margin: 0,
          }}
        >
          Ухаалаг шалгалтын системд тавтай морил!
        </p>
      </div>

      <div
        style={{
          width: "94px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "20px",
        }}
      >
        <NotificationBell variant="header" />

        <Avatar
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "999px",
            flexShrink: 0,
          }}
        >
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback>BT</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
