import { Suspense } from "react";
import { connection } from "next/server";
import Calendar, { CalendarShell } from "@/components/Calendar";
import { getShelf, getStatus } from "@/lib/data";
import { msUntilParisMidnight, parisToday, todayNumber } from "@/lib/dates";

// La coquille statique ne contient aucune donnée de café ; l’étagère est calculée à chaque requête.
async function CalendarData() {
  await connection();
  const today = parisToday();
  return (
    <Calendar
      shelf={getShelf(today)}
      todayN={todayNumber(today)}
      status={getStatus(today)}
      msToMidnight={msUntilParisMidnight()}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<CalendarShell />}>
      <CalendarData />
    </Suspense>
  );
}
