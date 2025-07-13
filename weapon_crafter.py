#!/usr/bin/env python3

from dataclasses import dataclass
from typing import Dict, Literal


Aspect = Literal["B", "E", "P", "F"]


class Armour:
    locations = {
        'cap/half helm': ['Sk'],
        '3/4 helm': ['Sk', 'Fa'],
        'coif': ['Sk', 'Nk'], # also ears and chin
        'great helm': ['Sk', 'Fa', 'Nk'],
        'cowl/hood': ['Sk', 'Nk'],
        'vest': ['Sh', 'Tx', 'Ab'],
        'tunic/byrnie': ['Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr'],
        'surcoat/tabard': ['Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th'],
        'surcoat, long': ['Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th', 'Kn'],
        'hauberk, short/tunic, long': ['Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th'],
        'shirt': ['Fo', 'El', 'Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr'],
        'gambeson/hauberk': ['Fo', 'El', 'Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th'],
        'robe': ['Fo', 'El', 'Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th', 'Kn', 'Ca'],
        'breeches': ['Hp', 'Gr', 'Th'],
        'hose': ['Th', 'Kn', 'Ca', 'Ft'],
        'leggings': ['Hp', 'Gr', 'Th', 'Kn', 'Ca', 'Ft'],
        'gauntlets/mittens': ['Ha'],
        'chest/back': ['Tx', 'Ab'],
        'ailettes': ['Sh'],
        'rerebraces': ['Ua'],
        'coudes': ['El'],
        'vambraces': ['Fo'],
        'kneecops': ['Kn'],
        'greaves': ['Ca'],
        'shoes': ['Ft'],
        'calf boots': ['Ca', 'Ft'],
        'knee boots': ['Kn', 'Ca', 'Ft'],
    }

    protection = {
        'linen':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'buckram':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'serge':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'russet':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'wool':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'worsted':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'silk':
            {'B': 1, 'E': 1, 'P': 1, 'F': 1},
        'quilt':
            {'B': 5, 'E': 3, 'P': 2, 'F': 4},
        'leather':
            {'B': 2, 'E': 4, 'P': 3, 'F': 3},
        'kurbul':
            {'B': 4, 'E': 5, 'P': 4, 'F': 3},
        'ring':
            {'B': 3, 'E': 6, 'P': 4, 'F': 3},
        'mail':
            {'B': 2, 'E': 8, 'P': 5, 'F': 1},
        'scale':
            {'B': 5, 'E': 9, 'P': 4, 'F': 5},
        'plate':
            {'B': 6, 'E': 10, 'P': 6, 'F': 2},
    }

    def __init__(self):
        self.layers = []  # List of (material, item) tuples

    def add(self, material, item):
        """Add an armour layer - DSL method."""
        self.layers.append((material, self._normalize_item(item)))
        return self  # Allow chaining

    def _normalize_item(self, item):
        """Convert partial item names to full dictionary keys"""
        # Check for exact match first
        if item in self.locations:
            return item

        # Check for partial matches
        for key in self.locations:
            if item in key.split('/'):
                return key

    def total_price(self):
        """Get total price of all armour layers."""
        return sum(price(material, total_coverage(self.locations[item])) for material, item in self.layers)

    def total_weight(self):
        """Get total weight of all armour layers."""
        return sum(weight(material, total_coverage(self.locations[item])) for material, item in self.layers)

    def print_protection(self):
        """Print Markdown table showing protection by location."""
        print("| Location | B | E | P | F |")
        print("| - | - | - | -| - |")

        for location in ['Sk', 'Fa', 'Nk', 'Sh', 'Ua', 'El', 'Fo', 'Ha', 'Tx', 'Ab', 'Hp', 'Gr', 'Th', 'Kn', 'Ca', 'Ft']:
            b = self.total_protection('B')[location]
            e = self.total_protection('E')[location]
            p = self.total_protection('P')[location]
            f = self.total_protection('F')[location]

            print(f"| {location} | {b} | {e} | {p} | {f} |")

        print()

    def total_protection(self, aspect: Aspect):
        """Get protection values by location for a specific attack type."""
        total_protection = {}
        for location in ['Sk', 'Fa', 'Nk', 'Sh', 'Ua', 'El', 'Fo', 'Ha', 'Tx', 'Ab', 'Hp', 'Gr', 'Th', 'Kn', 'Ca', 'Ft']:
            total_protection[location] = 0

        for material, item in self.layers:
            for location in self.locations[item]:
                total_protection[location] += self.protection[material][aspect]

        return total_protection


def total_coverage(locations):
    """Return the sum of percentages for a list of strike locations."""
    return sum(strike_percentage(location) for location in locations)


def strike_percentage(location):
    """Return the percentage chance of hitting a given strike location."""
    percentages = {
        'Sk': 4,
        'Fa': 4,
        'Nk': 4,
        'Sh': 8,
        'Ua': 6,
        'El': 4,
        'Fo': 6,
        'Ha': 4,
        'Tx': 20,
        'Ab': 10,
        'Hp': 6,
        'Gr': 4,
        'Th': 8,
        'Kn': 2,
        'Ca': 6,
        'Ft': 4,
    }

    return percentages[location]


def weight(material, coverage):
    """Return the weight of a piece of armour based on its material."""
    weights = {
        'buckram': 0.08,
        'kurbul': 0.25,
        'leather': 0.16,
        'linen': 0.08,
        'mail': 0.45,
        'plate': 0.8,
        'quilt': 0.24,
        'ring': 0.32,
        'russet': 0.08,
        'scale': 0.6,
        'serge': 0.08,
        'silk': 0.04,
        'wool': 0.12,
        'worsted': 0.06,
    }

    return weights[material] * coverage


def price(material, coverage):
    """Return the price of a piece of armour based on its material."""
    prices = {
        'buckram': 1.75,
        'kurbul': 4,
        'leather': 3.5,
        'linen': 1.75,
        'mail': 13,
        'plate': 25,
        'quilt': 3.5,
        'ring': 6,
        'russet': 3,
        'scale': 8,
        'serge': 1.75,
        'silk': 20,
        'wool': 4,
        'worsted': 10,
    }

    return round(prices[material] * coverage)


@dataclass
class Weapon:
    name: str
    weight: float
    price: int
    A: int
    D: int
    aspect: Aspect
    bonus: int

    @classmethod
    def create(cls, name: str, weight: float, price: int, A: int, D: int, B: int = None, E: int = None, P: int = None):
        """Create weapon with shorthand notation: E=12, P=11, or B=10."""
        args = [arg for arg in [("B", B), ("E", E), ("P", P)] if arg[1] is not None]

        assert len(args) == 1, "exactly one aspect must be given"

        aspect, bonus = args[0]

        return cls(name=name, A=A, D=D, aspect=aspect, bonus=bonus, weight=weight, price=price)

    def __str__(self):
        return f"{self.name}: {self.weight:.1f} lbs, {self.price}d, A/D={self.A}/{self.D}, {self.aspect}={self.bonus}"


class Armoury:
    weapons: Dict[str, Weapon] = {}

    def __init__(self):
        if not self.weapons:
            self.add(Weapon.create("hand/arm", weight=0, price=0, A=0, D=15, B=0))
            self.add(Weapon.create("foot/leg/knee", weight=0, price=0, A=5, D=5, B=1))
            self.add(Weapon.create("knight shield", weight=5, price=60, A=5, D=20, B=2))
            self.add(Weapon.create("round shield", weight=6, price=42, A=5, D=20, B=2))
            self.add(Weapon.create("dagger", weight=1, price=24, A=5, D=5, P=5))
            self.add(Weapon.create("shortsword", weight=2, price=90, A=10, D=5, P=4))
            self.add(Weapon.create("broadsword", weight=3, price=150, A=15, D=10, E=5))
            self.add(Weapon.create("falchion", weight=4, price=120, A=15, D=5, E=6))
            self.add(Weapon.create("battlesword", weight=8, price=230, A=25, D=10, E=8))
            self.add(Weapon.create("spear", weight=5, price=60, A=20, D=10, P=7))

    def add(self, weapon: Weapon):
        """Add weapon to armoury."""
        self.weapons[weapon.name] = weapon

    def get(self, name: str) -> Weapon:
        """Get a weapon by name."""
        return self.weapons[name]


if __name__ == "__main__":
    for material in ['linen', 'buckram', 'serge', 'russet', 'wool', 'worsted', 'silk', 'quilt', 'leather', 'kurbul', 'ring', 'mail', 'scale', 'plate']:
        print(f"| {material} | weight | price | coverage | % |")
        print('| - | - | - | - | - |')

        for name, locations in Armour.locations.items():
            coverage = total_coverage(locations)
            if name == 'chest/back':
                coverage //= 2
                print(f"| breastplate | {weight(material, coverage):.1f} | {price(material, coverage)} | front {' '.join(locations)} | {coverage} |")
                print(f"| backplate | {weight(material, coverage):.1f} | {price(material, coverage)} | rear {' '.join(locations)} | {coverage} |")
            elif name == 'coif':
                coverage += 1
                print(f"| {name} | {weight(material, coverage):.1f} | {price(material, coverage)} | {' '.join(locations)} | {coverage} |")
            else:
                print(f"| {name} | {weight(material, coverage):.1f} | {price(material, coverage)} | {' '.join(locations)} | {coverage} |")

        print()
