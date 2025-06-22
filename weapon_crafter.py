#!/usr/bin/env python3


def coverage(locations):
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
        'Ft': 4
    }

    return percentages.get(location)


def weight(material, coverage):
    """Return the weight of a piece of armor based on its material."""
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

    return weights.get(material) * coverage


def price(material, coverage):
    """Return the price of a piece of armor based on its material."""
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
    return round(prices.get(material) * coverage * price_reduction)


if __name__ == "__main__":
    armour = {
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

    for material in ['buckram', 'kurbul', 'leather', 'linen', 'mail', 'plate', 'quilt', 'ring', 'russet', 'scale', 'serge', 'silk', 'wool', 'worsted']:
        print(f"| {material} | weight | price | coverage | % |")
        print('| - | - | - | - | - |')

        for name, locations in armour.items():
            total_coverage = coverage(locations)
            if name == 'chest/back':
                total_coverage //= 2
                print(f"| breastplate | {weight(material, total_coverage):.1f} | {price(material, total_coverage)} | front {' '.join(locations)} | {total_coverage} |")
                print(f"| backplate | {weight(material, total_coverage):.1f} | {price(material, total_coverage)} | rear {' '.join(locations)} | {total_coverage} |")
            else:
                print(f"| {name} | {weight(material, total_coverage):.1f} | {price(material, total_coverage)} | {' '.join(locations)} | {total_coverage} |")

        print()
