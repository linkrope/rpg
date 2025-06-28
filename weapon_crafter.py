#!/usr/bin/env python3


class Armour:
    locations = {
        'cap/half helm': ['Sk'],
        '3/4 helm': ['Sk', 'Fa'],
        'great helm': ['Sk', 'Fa', 'Nk'],
        'cowl/hood': ['Sk', 'Nk'],
        'vest': ['Sh', 'Tx', 'Ab'],
        'tunic/byrnie': ['Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr'],
        'surcoat': ['Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th'],
        'gambeson/hauberk': ['Fo', 'El', 'Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th'],
        'robe': ['Fo', 'El', 'Ua', 'Sh', 'Tx', 'Ab', 'Hp', 'Gr', 'Th', 'Kn', 'Ca'],
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

    def total_protection(self, type):
        """Get protection values by location for a specific attack type."""
        total_protection = {}
        for location in ['Sk', 'Fa', 'Nk', 'Sh', 'Ua', 'El', 'Fo', 'Ha', 'Tx', 'Ab', 'Hp', 'Gr', 'Th', 'Kn', 'Ca', 'Ft']:
            total_protection[location] = 0

        for material, item in self.layers:
            for location in self.locations[item]:
                total_protection[location] += self.protection[material][type]

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
        'buckram': 0.1,
        'kurbul': 0.4,
        'leather': 0.2,
        'linen': 0.1,
        'mail': 0.5,
        'plate': 0.8,
        'quilt': 0.3,
        'ring': 0.4,
        'russet': 0.1,
        'scale': 0.5,
        'serge': 0.1,
        'silk': 0.05,
        'wool': 0.15,
        'worsted': 0.075,
    }

    return weights[material] * coverage


def price(material, coverage):
    """Return the price of a piece of armour based on its material."""
    prices = {
        'buckram': 2,
        'kurbul': 5,
        'leather': 4,
        'linen': 2,
        'mail': 15,
        'plate': 25,
        'quilt': 4,
        'ring': 7,
        'russet': 3,
        'scale': 7.5,
        'serge': 2,
        'silk': 20,
        'wool': 4,
        'worsted': 10,
    }

    price_reduction = (100 - coverage // 10 * 5) / 100
    return round(prices[material] * coverage * price_reduction)


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
            else:
                print(f"| {name} | {weight(material, coverage):.1f} | {price(material, coverage)} | {' '.join(locations)} | {coverage} |")

        print()

    armour = Armour()\
        .add('plate', '3/4 helm')\
        .add('quilt', 'cowl')\
        .add('linen', 'vest')\
        .add('leather', 'tunic')\
        .add('leather', 'gauntlets')\
        .add('linen', 'leggings')\
        .add('leather', 'leggings')\
        .add('leather', 'shoes')\
        .add('kurbul', 'chest/back')\
        .add('kurbul', 'ailettes')\
        .add('kurbul', 'rerebraces')\
        .add('kurbul', 'coudes')\
        .add('kurbul', 'vambraces')\
        .add('kurbul', 'kneecops')\
        .add('kurbul', 'greaves')

    armour.print_protection()
    print(f'price: {armour.total_price()}, weight: {armour.total_weight():.1f}')
