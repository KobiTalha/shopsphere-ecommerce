#include <iostream>
#include <vector>

int binarySearch(const std::vector<int>& arr, int target) {
    int left = 0;
    int right = static_cast<int>(arr.size()) - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;

        if (arr[mid] == target) {
            return mid;
        }

        if (arr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return -1;
}

int main() {
    std::vector<int> numbers = {2, 4, 6, 8, 10, 12, 14, 16, 18, 20};
    int target;

    std::cout << "Enter the number to search: ";
    std::cin >> target;

    int result = binarySearch(numbers, target);

    if (result != -1) {
        std::cout << "Number found at index " << result << '\n';
    } else {
        std::cout << "Number not found\n";
    }

    return 0;
}
