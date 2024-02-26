fn main(min: pub u64, max: pub u64, data: u64) {
    assert(data >= min);
    assert(data <= max);
}

#[test]
fn test_main() {
    main(0, 10, 5);
}
