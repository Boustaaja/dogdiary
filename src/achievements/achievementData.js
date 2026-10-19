import badge from "../assets/badges/badge.svg";
import badge3x from "../assets/badges/3x_badge.svg";
import badge5x from "../assets/badges/5x_badge.svg";
import badge7x from "../assets/badges/7x_badge.svg";
import walkBadge from "../assets/badges/walk.svg";
import walk3Badge from "../assets/badges/walk3.svg";
import walk5Badge from "../assets/badges/walk5.svg";
import walk10Badge from "../assets/badges/walk10.svg";
import forestBadge from "../assets/badges/forest.svg";
import dogDayBadge from "../assets/badges/dogDay.svg";
import dogParkBadge from "../assets/badges/dogPark.svg";

export const achievementGroups = [
  {
    id: "shared",
    title: "Yhteiset",
    description: "Yhdessä ansaitut palkinnot",
    badges: [
      {
        id: "good-day",
        name: "Hyvä koirapäivä",
        description: "Kaikki päivän tavoitteet saavutettu",
        icon: badge,
        milestone: null,
      },
      {
        id: "three-day-streak",
        name: "Kolmen päivän putki",
        description: "Kaikki päivätavoitteet täytetty 3 peräkkäisenä päivänä",
        icon: badge3x,
        milestone: 3,
      },
      {
        id: "five-day-streak",
        name: "Viiden päivän putki",
        description: "Kaikki päivätavoitteet täytetty 5 peräkkäisenä päivänä",
        icon: badge5x,
        milestone: 5,
      },
      {
        id: "seven-day-streak",
        name: "Täydellinen viikko",
        description: "Kaikki päivätavoitteet täytetty 7 peräkkäisenä päivänä",
        icon: badge7x,
        milestone: 7,
      },
    ],
  },
  {
    id: "personal",
    title: "Henkilökohtaiset",
    description: "Omat saavutukset lenkkeilystä",
    badges: [
      {
        id: "long-walk",
        name: "Lenkkikaverit",
        description: "Kävele vähintään tunti",
        icon: walkBadge,
        milestone: null,
      },
      {
        id: "three-long-walks",
        name: "Ahkerat ulkoilijat",
        description: "Kerää 3 tunnin lenkkiä",
        icon: walk3Badge,
        milestone: 3,
      },
      {
        id: "five-long-walks",
        name: "Kokeneet lenkkeilijät",
        description: "Kerää 5 tunnin lenkkiä",
        icon: walk5Badge,
        milestone: 5,
      },
      {
        id: "ten-long-walks",
        name: "Lenkkipolkujen mestarit",
        description: "Kerää 10 tunnin lenkkiä",
        icon: walk10Badge,
        milestone: 10,
      },
    ],
  },
  {
    id: "daily-tasks",
    title: "Päivän tehtävät",
    description: "Päivittäisistä koiraseikkailuista ansaitut palkinnot",
    badges: [
      {
        id: "forest",
        name: "Metsälenkki",
        description: "Tehkää lenkki metsässä.",
        icon: forestBadge,
        milestone: null,
      },
      {
        id: "dog-day",
        name: "Koiran vuoro",
        description: "Anna koiran johdattaa lenkkiä.",
        icon: dogDayBadge,
        milestone: null,
      },
      {
        id: "dog-park",
        name: "Puistopäivä",
        description: "Käykää koirapuistossa.",
        icon: dogParkBadge,
        milestone: null,
      },
    ],
  },
];
