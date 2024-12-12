import unittest
import math
from student1 import sphere_volume

class TestSphereVolume(unittest.TestCase):
    def test_default_radius(self):
        """Test that the function returns 0 when the default radius is used."""
        self.assertEqual(sphere_volume(), 0)

    def test_positive_radius(self):
        """Test the function with a positive radius."""
        self.assertAlmostEqual(sphere_volume(1), 4 / 3 * math.pi, places=5)
        self.assertAlmostEqual(sphere_volume(3), 4 / 3 * math.pi * 27, places=5)

    def test_large_radius(self):
        """Test the function with a large radius."""
        self.assertAlmostEqual(sphere_volume(10), 4 / 3 * math.pi * 1000, places=5)

    def test_negative_radius(self):
        """Test how the function handles a negative radius."""
        # If the function must return 0 for negative radius, adjust this accordingly.
        self.assertAlmostEqual(sphere_volume(-1), 4 / 3 * math.pi * (-1)**3, places=5)

if __name__ == "__main__":
    unittest.main()
